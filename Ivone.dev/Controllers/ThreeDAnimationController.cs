using System.Text.Json;
using Ivone.dev.ThreeDAnimation;
using Microsoft.AspNetCore.Mvc;

namespace Ivone.dev.Controllers;

[ApiController]
[Route("api/3d-animation")]
public sealed class ThreeDAnimationController : ControllerBase
{
    private readonly ThreeDAnimationStore _store;
    private readonly ScenePlanner _planner;

    public ThreeDAnimationController(ThreeDAnimationStore store, ScenePlanner planner)
    {
        _store = store;
        _planner = planner;
    }

    [HttpGet("projects/{projectId}")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> GetProject(string projectId, CancellationToken cancellationToken)
    {
        if (!_store.IsValidId(projectId))
        {
            return BadRequest(new { message = "The project id is not valid." });
        }

        var project = await _store.ReadProjectAsync(projectId, cancellationToken);
        if (project is null)
        {
            return NotFound();
        }

        Response.Headers.ETag = project.ETag;
        return Content(project.Json, "application/json");
    }

    [HttpPut("projects/{projectId}")]
    [RequestSizeLimit(ThreeDAnimationStore.MaximumSceneBytes)]
    public async Task<IActionResult> PutProject(
        string projectId,
        [FromBody] JsonElement document,
        CancellationToken cancellationToken)
    {
        if (!_store.IsValidId(projectId))
        {
            return BadRequest(new { message = "The project id is not valid." });
        }

        try
        {
            var etag = await _store.WriteProjectAsync(projectId, document, cancellationToken);
            Response.Headers.ETag = etag;
            return NoContent();
        }
        catch (InvalidDataException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpGet("projects/{projectId}/versions")]
    public IActionResult GetVersions(string projectId)
    {
        if (!_store.IsValidId(projectId))
        {
            return BadRequest(new { message = "The project id is not valid." });
        }

        return Ok(_store.ListVersions(projectId));
    }

    [HttpGet("projects/{projectId}/versions/{versionId}")]
    public async Task<IActionResult> GetVersion(
        string projectId,
        string versionId,
        CancellationToken cancellationToken)
    {
        if (!_store.IsValidId(projectId))
        {
            return BadRequest(new { message = "The project id is not valid." });
        }

        var version = await _store.ReadVersionAsync(projectId, versionId, cancellationToken);
        return version is null ? NotFound() : Content(version.Json, "application/json");
    }

    [HttpPost("plan")]
    public IActionResult Plan([FromBody] ScenePlanRequest request)
    {
        var validation = SceneDocumentValidator.Validate(request.Scene);
        if (!validation.IsValid)
        {
            return BadRequest(new
            {
                message = "The current scene is not valid.",
                errors = validation.Errors
            });
        }

        return Ok(_planner.Plan(request));
    }

    [HttpPost("validate")]
    public IActionResult Validate([FromBody] JsonElement document) =>
        Ok(SceneDocumentValidator.Validate(document));

    [HttpPost("assets")]
    [RequestSizeLimit(ThreeDAnimationStore.MaximumAssetBytes)]
    public async Task<IActionResult> UploadAsset(IFormFile file, CancellationToken cancellationToken)
    {
        try
        {
            var asset = await _store.SaveAssetAsync(file, cancellationToken);
            return Created(asset.Uri, asset);
        }
        catch (InvalidDataException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpGet("assets/{assetId}")]
    public IActionResult GetAsset(string assetId)
    {
        var asset = _store.FindAsset(assetId);
        return asset is null
            ? NotFound()
            : PhysicalFile(asset.Value.Path, asset.Value.ContentType, enableRangeProcessing: true);
    }
}
