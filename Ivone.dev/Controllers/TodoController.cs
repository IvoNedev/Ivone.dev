using Ivone.dev.Todo;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Ivone.dev.Controllers;

[ApiController]
[Route("api/todo")]
public sealed class TodoController : ControllerBase
{
    private readonly TodoFileStore _store;

    public TodoController(TodoFileStore store)
    {
        _store = store;
    }

    [HttpGet("{syncKey}")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Get(string syncKey, CancellationToken cancellationToken)
    {
        if (!_store.IsValidKey(syncKey))
        {
            return BadRequest(new { message = "That sync key is not valid." });
        }

        var document = await _store.ReadAsync(syncKey, cancellationToken);
        if (document is null)
        {
            return NotFound();
        }

        Response.Headers.ETag = document.ETag;
        return Content(document.Json, "application/json");
    }

    [HttpPut("{syncKey}")]
    [RequestSizeLimit(TodoFileStore.MaximumDocumentBytes)]
    public async Task<IActionResult> Put(
        string syncKey,
        [FromBody] JsonElement document,
        CancellationToken cancellationToken)
    {
        if (!_store.IsValidKey(syncKey))
        {
            return BadRequest(new { message = "That sync key is not valid." });
        }

        try
        {
            var ifMatch = Request.Headers.IfMatch.ToString();
            var createOnly = Request.Headers.IfNoneMatch.Any(value => value == "*");
            if (string.IsNullOrWhiteSpace(ifMatch) && !createOnly)
            {
                return StatusCode(StatusCodes.Status428PreconditionRequired, new
                {
                    message = "Sync requires If-Match or If-None-Match so an older device cannot overwrite newer notes."
                });
            }

            var etag = await _store.WriteAsync(
                syncKey,
                document,
                string.IsNullOrWhiteSpace(ifMatch) ? null : ifMatch,
                createOnly,
                cancellationToken);
            Response.Headers.ETag = etag;
            return NoContent();
        }
        catch (TodoPreconditionFailedException)
        {
            return StatusCode(StatusCodes.Status412PreconditionFailed, new
            {
                message = "A newer copy of these notes is already available. Download it and retry."
            });
        }
        catch (InvalidDataException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}
