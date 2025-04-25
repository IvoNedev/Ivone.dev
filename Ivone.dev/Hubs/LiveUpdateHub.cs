using Microsoft.AspNetCore.SignalR;

public class LiveUpdateHub : Hub
{
    public async Task SendUpdate(string key, string value)
    {
        await Clients.Others.SendAsync("ReceiveUpdate", key, value);
    }
}
