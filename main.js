var fs = require("fs");
const path = require("path");

var FILE_ENCODING = "utf-8";
const fileNameRegex = /.translations.[ -~]+.json/;

function getFilesRecursively(directory) {
  let files = [];

  const filesInDirectory = fs.readdirSync(directory);
  for (const file of filesInDirectory) {
    const absolute = path.join(directory, file);
    if (fs.statSync(absolute).isDirectory()) {
      files.push(...getFilesRecursively(absolute));
    } else {
      if (fileNameRegex.test(file)) {
        var lang = fileNameRegex
          .exec(file)[0]
          .replace(".translations.", "")
          .replace(".json", "");
        files.push({
          lang: lang,
          absolutePath: absolute,
        });
      }
    }
  }
  return files;
}

function groupBy(initialArray, groupKeyFunc) {
  return initialArray.reduce(
    (entryMap, item) =>
      entryMap.set(groupKeyFunc(item), [
        ...(entryMap.get(groupKeyFunc(item)) || []),
        item,
      ]),
    new Map()
  );
}

function getLineBreakChar(string) {
  const indexOfLF = string.indexOf("\n", 1);
  if (indexOfLF === -1) {
    if (string.indexOf("\r") !== -1) {
      return "\r";
    }
    return "\n";
  }
  if (string[indexOfLF - 1] === "\r") {
    return "\r\n";
  }
  return "\n";
}

function processJsonForMerge(jsonContent) {
  jsonContent = jsonContent.replace("{", "");
  jsonContent = jsonContent.substring(0, jsonContent.lastIndexOf("}"));
  jsonContent = jsonContent.replace(/^[\r\n]+|[\r\n]+$/g, "");
  return jsonContent;
}

function mergeJson(jsonContents) {
  const lineBreakChar = getLineBreakChar(jsonContents);
  let resultJson = jsonContents.join(`,${lineBreakChar}`);

  return `{${lineBreakChar}${resultJson}${lineBreakChar}}`;
}

function getLevelKeys(jsonContent) {
  const regex = /(?<!:[\n\r\s]*[{[][\s\S]*)"([^"\\]*)"(?=\s*:)/g;
  let regexResult = regex.exec(jsonContent);
  const keys = [];
  while (regexResult) {
    if (regexResult) {
      keys.push(regexResult[1]);
    }

    regexResult = regex.exec(jsonContent);
  }

  return keys;
}

function getChildJsons(jsonContent) {
  const regex = /{(?:[\s\S])*}/g;
  let regexResult = regex.exec(jsonContent);
  const childJsons = [];
  while (regexResult) {
    if (regexResult) {
      childJsons.push(regexResult[1]);
    }

    regexResult = regex.exec(jsonContent);
  }

  return childJsons;
}

function validateMerge(jsonContents) {
  // We are validating only top level keys, if the root is unique we assume the children are unique too
  // as that should be handled by IDE's in the context of each seperate file

  var allKeys = [];
  for (const content of jsonContents) {
    const levelKeys = getLevelKeys(content);
    let isFound = allKeys.some((masterArray) =>
      levelKeys.includes(masterArray)
    );
    if (isFound) {
      throw new Error(
        "Dublicate key found in JSON, cannot create output json with dublicate keys."
      );
    }
    allKeys.push(...levelKeys);

    // This function us unused, we can enable this to analyze JSON deeper
    // const jsonChildren = getChildJsons(content)
    // for(const jsonChild of jsonChildren) {
    //   validateMerge(jsonChild)
    // }
  }
}

function mergeTranslations(opts) {
  var langGroupLists = opts.src;
  var distPath = opts.dest;

  for (const [key, value] of langGroupLists) {
    var jsonContents = value.map((file) =>
      processJsonForMerge(fs.readFileSync(file.absolutePath, FILE_ENCODING))
    );

    validateMerge(jsonContents);

    fs.writeFileSync(
      path.join(distPath, "translations." + key + ".json"),
      mergeJson(jsonContents),
      FILE_ENCODING
    );
  }
}

function mergeFiles(sourcePath, destinationPath) {
  var files = getFilesRecursively(sourcePath);
  mergeTranslations({
    src: groupBy(files, (item) => item.lang),
    dest: destinationPath,
  });
}

module.exports = mergeFiles;
