#! /usr/bin/env node

var fs = require("fs");
const yargs = require("yargs");
const mergeFiles = require("./main");

const coercePath = (path) => {
  if (!fs.lstatSync(path).isDirectory()) {
    throw new Error(`"${path}" is not a valid path`);
  }
  return path;
};

const builder = (command) =>
  command
    .positional("source", {
      describe: "source path from which to aggregate translation json files",
      type: "string",
      coerce: coercePath,
    })
    .positional("destination", {
      describe:
        "destination path whre to place the aggregated translation files",
      type: "string",
      coerce: coercePath,
    });

const handler = ({ source, destination }) => mergeFiles(source, destination);

yargs
  .command("$0 <source> <destination>", false, builder, handler)
  .help()
  .wrap(yargs.terminalWidth())
  .parse();
