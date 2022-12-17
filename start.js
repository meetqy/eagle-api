const jsonServer = require("./json-server/lib/server");
const express = require("express");
const chokidar = require("chokidar");
const fs = require("fs-extra");
const path = require("path");
require("dotenv").config({
  path: "./.env",
});

const server = express();

// eagle library
const { library_dir: dir, port } = process.env;

const imagesFile = path.join(dir, "./images.json");
const changeFile = path.join(dir, "./change/*.json");
const addFile = path.join(dir, "./add/*.json");
const eagleApiData = {
  tags: {},
  metadata: {},
  // 全部 + 回收站 = images
  images: [],
  change: {
    // "2022-11-25": [{}]
  },
  add: {
    // "2022-11-25": [{}]
  },
};

const listenImage = () => {
  return new Promise((resolve) => {
    chokidar
      .watch(imagesFile)
      .on("add", (file) => {
        eagleApiData.images = fs.readJSONSync(file);
      })
      .on("change", (file) => {
        eagleApiData.images = fs.readJSONSync(file);
      })
      .on("ready", () => {
        resolve();
      });
  });
};

const listenChange = () => {
  return new Promise((resolve) => {
    chokidar
      .watch(changeFile)
      .on("add", (file) => {
        const [filename] = file.match(/\d+-.*?\.json/);
        const day = filename.replace(".json", "");

        eagleApiData.change[day] = fs.readJSONSync(file);
      })
      .on("change", (file) => {
        const [filename] = file.match(/\d+-.*?\.json/);
        const day = filename.replace(".json", "");

        eagleApiData.change[day] = fs.readJSONSync(file);
      })
      .on("ready", () => {
        resolve();
      });
  });
};

const listenAdd = () => {
  return new Promise((resolve) => {
    chokidar
      .watch(addFile)
      .on("add", (file) => {
        const [filename] = file.match(/\d+-.*?\.json/);
        const day = filename.replace(".json", "");

        eagleApiData.change[day] = fs.readJSONSync(file);
      })
      .on("change", (file) => {
        const [filename] = file.match(/\d+-.*?\.json/);
        const day = filename.replace(".json", "");

        eagleApiData.change[day] = fs.readJSONSync(file);
      })
      .on("ready", () => {
        resolve();
      });
  });
};

(async () => {
  await listenAdd();
  await listenChange();
  await listenImage();

  const middlewares = jsonServer.defaults();

  const eagleApiDataTemp = eagleApiData;

  const router = jsonServer.router(eagleApiDataTemp);

  server.use(middlewares);

  server.use(
    "/static",
    express.static(path.join(dir, "/images"), {
      maxAge: 86400000 * 365,
    })
  );

  server.use(router);

  server.listen(port, () => {
    console.log(`JSON Server is running: http://localhost:${port}`);
  });
})();
