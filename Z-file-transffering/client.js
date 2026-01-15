const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "proto/file_transfer.proto");
const SERVER_ADDRESS = "0.0.0.0:50051";

const packageDef = protoLoader.loadSync(PROTO_PATH);
const proto = grpc.loadPackageDefinition(packageDef).filetransfer;

function downloadFile(fileName, outputFile) {
  let offset = fs.existsSync(outputFile)
    ? fs.statSync(outputFile).size
    : 0;

  const client = new proto.FileTransferService(
    SERVER_ADDRESS,
    grpc.credentials.createInsecure()
  );

  const call = client.DownloadFile({ file_name: fileName, offset:0 });
  const writeStream = fs.createWriteStream(outputFile, { flags: "a" });

  call.on("data", (chunk) => {
    if (chunk.eof) {
      writeStream.close();
      console.log("Download completed");
      return;
    }
    writeStream.write(chunk.data);
  });

  call.on("error", (err) => {
    console.error("Download failed:", err.message);
    writeStream.close();
  });
}

downloadFile("practice.java", "fileTransfer.txt");
