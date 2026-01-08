const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const readline = require("readline");

const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, "proto/message.proto")
);

const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const messagePackage = grpcObject.UserMessage;

const client = new messagePackage.MessageService(
  "localhost:6000",
  grpc.credentials.createInsecure()
);


const call = client.getMessage();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

call.on("data", (response) => {
  console.log("Message from server:", response.message);
});

call.on("end", () => {
  console.log("Server closed connection");
  rl.close();
});

call.on("error", (err) => {
  console.error("Stream error:", err.message);
  rl.close();
});


function askMessage() {
  rl.question("Enter your message: ", (message) => {
    if (message.toLowerCase() === "exit") {
      console.log("Client closed");
      call.end();  
      rl.close();
      return;
    }

    call.write({ message }); 
    askMessage();           
  });
}

askMessage();