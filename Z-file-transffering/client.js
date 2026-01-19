const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const fs = require("fs");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "proto/file_transfer.proto");
const SERVER_ADDRESS = "10.105.54.157:50051";

const packageDef = protoLoader.loadSync(PROTO_PATH);
const proto = grpc.loadPackageDefinition(packageDef).filetransfer;

function downloadFile(fileName, outputFile) {
  let offset = fs.existsSync(outputFile)
    ? fs.statSync(outputFile).size
    : 0;
   var  count= (offset)/(3*1024*1024);

  const client = new proto.FileTransferService(
    SERVER_ADDRESS,
    grpc.credentials.createInsecure()
  );

  const call = client.DownloadFile({ file_name: "guptha", offset });
  const writeStream = fs.createWriteStream(outputFile, { flags: "a" });

  call.on("data", (chunk) => {
    if (chunk.eof) {
      writeStream.close();
     
      console.log("Download completed");
      return;
    }

    writeStream.write(chunk.data);
    console.log(count, "downlaoded");
    count++;
  });

  call.on("error", (err) => {
    console.error("Download failed:", err.message);
    writeStream.close();
  });
}

downloadFile("practice.java", "./files-2gb/file3.txt");
