import * as signalR from '@microsoft/signalr';

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/liveupdate") // Relative path for both localhost and production
    .withAutomaticReconnect()
    .withHubProtocol(new signalR.JsonHubProtocol())
    .configureLogging(signalR.LogLevel.Debug) // Enable Debug Logging
    .build();

connection.start().catch(err => console.error("Connection Error: ", err));

export const sendUpdate = (key, value) => {
    connection.invoke("SendUpdate", key, value).catch(err => console.error(value+ " Send Error: ", err));
};

export const onReceiveUpdate = (callback) => {
    connection.on("ReceiveUpdate", (key, value) => {
        callback(key, value);
    });
};
