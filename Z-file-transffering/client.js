const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
const path = require("path");

const PROTO_PATH = "./file_transfer.proto";
const SERVER_ADDRESS = "localhost:50051";

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition)
  .filetransfer;

function downloadFile(fileName, outputFile) {
  let offset = 0;

  if (fs.existsSync(outputFile)) {
    offset = fs.statSync(outputFile).size;
    console.log(`Resuming download from byte ${offset}`);
  }

  const client = new proto.FileTransferService(
    SERVER_ADDRESS,
    grpc.credentials.createInsecure()
  );

  const call = client.DownloadFile({
    file_name: fileName,
    offset: offset,
  });

  const writeStream = fs.createWriteStream(outputFile, { flags: "a" });

  call.on("data", (chunk) => {
    if (chunk.eof) {
      console.log("Download completed");
      writeStream.close();
      return;
    }
    writeStream.write(chunk.data);
  });

  call.on("end", () => {
    console.log("Stream ended");
  });

  call.on("error", (err) => {
    console.error("Download failed:", err.message);
    writeStream.close();
  });
}

downloadFile("sample.txt", "downloaded_sample.txt");
