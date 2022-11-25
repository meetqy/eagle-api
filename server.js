const jsonServer = require("json-server");
const chokidar = require("chokidar");
const fs = require("fs-extra");
const path = require("path");
require("dotenv").config();

const today = new Date().toISOString().split("T")[0];

// eagle library
const { library_dir: dir, is_expand, port, is_value_to_json } = process.env;
const isExpand = +is_expand;
const isValueToJson = +is_value_to_json;

const server = jsonServer.create();
const middlewares = jsonServer.defaults();
const imagesFile = path.join(dir, "./images.json");
const changeFile = path.join(dir, "./change");
const addFile = path.join(dir, "./add");

// 是否需要初始化，默认启动程序需要初始化，eagleApiData.add 无需添加
let isInit = true;

const eagleApiData = {
  tags: {},
  metadata: {},
  images:
    fs.readJSONSync(imagesFile, {
      throws: false,
    }) || [],
  change: {
    // "2022-11-25": [{}]
  },
  add: {
    // "2022-11-25": [{}]
  },
};

// 初始化
fs.ensureDirSync(changeFile);
fs.ensureDirSync(addFile);

eagleApiData.change[today] =
  fs.readJsonSync(path.join(changeFile, `./${today}.json`), {
    throws: false,
  }) || [];
eagleApiData.add[today] =
  fs.readJsonSync(path.join(addFile, `./${today}.json`), { throws: false }) ||
  [];

function watcherNormal(filename) {
  const watcher = chokidar.watch(path.join(dir, `./${filename}.json`));

  return new Promise((resolve) => {
    watcher
      .on("add", async (path) => {
        eagleApiData[filename] = fs.readJSONSync(path);
      })
      .on("change", (path) => {
        eagleApiData[filename] = fs.readJSONSync(path);
      })
      .on("ready", () => {
        console.log(`【${filename}】初始化成功，开始监听...`);
        resolve();
      });
  });
}

function watcherImages() {
  const images = eagleApiData.images;

  const watcher = chokidar.watch(dir + "/images/**/*.json");
  let num = 0;
  const timer = setInterval(() => {
    num++;
    process.stdout.write(
      "【images】开始处理，图片越多时间越久(" + num + "s)\r"
    );
  }, 1000);

  // images中的对象转换为字符串
  function handleJsonValueToString(json) {
    if (isValueToJson) {
      return {
        ...json,
        tags: JSON.stringify(json.tags),
        folders: JSON.stringify(json.folders),
        palettes: JSON.stringify(json.palettes),
      };
    }

    return json;
  }

  return new Promise((resolve) => {
    return watcher
      .on("add", async (_path) => {
        const json = handleJsonValueToString(fs.readJSONSync(_path));
        if (!images.find((item) => item.id === json.id)) {
          images.push(json);
          fs.writeJsonSync(imagesFile, images);

          if (!isInit) {
            // add
            eagleApiData.add[today].push(json);
            fs.writeJSONSync(
              path.join(addFile, `./${today}.json`),
              eagleApiData.add[today]
            );
          }
        }
      })
      .on("change", (_path) => {
        const id = _path
          .split("/")
          .find((item) => item.includes(".info"))
          .split(".info")[0];

        const json = handleJsonValueToString(fs.readJSONSync(_path));
        images.splice(
          images.findIndex((item) => item.id === id),
          1,
          json
        );

        // change
        const change = eagleApiData.change[today];
        if (!change.length) {
          change.push(json);
        } else {
          change.splice(
            change.findIndex((item) => item.id === id),
            1,
            json
          );
        }
        fs.writeJSONSync(path.join(changeFile, `./${today}.json`), change);
        eagleApiData.change[today] = change;

        fs.writeJSONSync(imagesFile, images);
        eagleApiData.images = images;
      })
      .on("ready", () => {
        clearInterval(timer);
        console.log(`【images】初始化成功，开始监听...`);
        isInit = false;
        resolve();
      });
  });
}

(async () => {
  await watcherNormal("tags");
  await watcherNormal("metadata");
  await watcherImages();

  const { images, tags, metadata } = eagleApiData;

  const eagleApiDataTemp = isExpand
    ? {
        images,
        ...tags,
        ...metadata,
      }
    : eagleApiData;

  if (isExpand) {
    delete eagleApiDataTemp.modificationTime;
    delete eagleApiDataTemp.applicationVersion;
  }

  server.use(middlewares);

  const router = jsonServer.router(eagleApiDataTemp);

  server.use(router);

  server.listen(port, () => {
    console.log(`JSON Server is running: http://localhost:${port}`);
  });
})();