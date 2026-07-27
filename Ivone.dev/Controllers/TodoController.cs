using Ivone.dev.Todo;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Ivone.dev.Controllers;

[ApiController]
[Route("api/todo")]
public sealed class TodoController : ControllerBase
{
    private readonly TodoSqlStore _store;

    public TodoController(TodoSqlStore store)
    {
        _store = store;
    }

    [HttpGet]
    [HttpGet("{syncKey}")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken, string? syncKey = null)
    {
        var document = await _store.ReadAsync(cancellationToken);
        if (document is null)
        {
            return NotFound();
        }

        Response.Headers.ETag = document.ETag;
        return Content(document.Json, "application/json");
    }

    [HttpPut]
    [HttpPut("{syncKey}")]
    [RequestSizeLimit(TodoSqlStore.MaximumDocumentBytes)]
    public async Task<IActionResult> Put(
        [FromBody] JsonElement document,
        CancellationToken cancellationToken,
        string? syncKey = null)
    {
        try
        {
            var ifMatch = Request.Headers.IfMatch.ToString();
            var createOnly = Request.Headers.IfNoneMatch.Any(value => value == "*");
            if (string.IsNullOrWhiteSpace(ifMatch) && !createOnly)
            {
                return StatusCode(StatusCodes.Status428PreconditionRequired, new
                {
                    message = "Sync requires If-Match or If-None-Match so an older device cannot overwrite the shared Todo data."
                });
            }

            var etag = await _store.WriteAsync(
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
                message = "A newer shared copy is already available. Refresh and retry."
            });
        }
        catch (InvalidDataException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }
}
