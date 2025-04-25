using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Collections.Generic;

[Route("api/[controller]")]
[ApiController]
public class TimelineController : ControllerBase
{
    private readonly ITimelineService _timelineService;

    public TimelineController(ITimelineService timelineService)
    {
        _timelineService = timelineService;
    }

    // Get all timelines for a user (pass userId as query parameter)
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetTimelinesForUser(int userId)
    {
        List<Timeline> timelines = await _timelineService.GetTimelinesForUserAsync(userId);
        return Ok(timelines);
    }

    // Get a specific timeline with its events
    [HttpGet("{timelineId}")]
    public async Task<IActionResult> GetTimeline(int timelineId)
    {
        Timeline timeline = await _timelineService.GetTimelineByIdAsync(timelineId);
        if (timeline == null)
        {
            return NotFound();
        }
        return Ok(timeline);
    }

    // Create a new timeline
    [HttpPost]
    public async Task<IActionResult> CreateTimeline([FromBody] Timeline timeline)
    {
        await _timelineService.AddTimelineAsync(timeline);
        return Ok(timeline);
    }

    // Update a timeline
    [HttpPut("{timelineId}")]
    public async Task<IActionResult> UpdateTimeline(int timelineId, [FromBody] Timeline timeline)
    {
        if (timelineId != timeline.Id)
            return BadRequest();
        await _timelineService.UpdateTimelineAsync(timeline);
        return Ok();
    }

    // Delete a timeline
    [HttpDelete("{timelineId}")]
    public async Task<IActionResult> DeleteTimeline(int timelineId)
    {
        await _timelineService.DeleteTimelineAsync(timelineId);
        return Ok();
    }

    // Timeline event endpoints
    [HttpGet("{timelineId}/events")]
    public async Task<IActionResult> GetEvents(int timelineId)
    {
        var events = await _timelineService.GetEventsByTimelineAsync(timelineId);
        return Ok(events);
    }

    [HttpPost("{timelineId}/events")]
    public async Task<IActionResult> AddEvent(int timelineId, [FromBody] TimelineEvent timelineEvent)
    {
        timelineEvent.TimelineId = timelineId;
        await _timelineService.AddEventAsync(timelineEvent);
        return Ok(timelineEvent);
    }

    [HttpPut("events/{eventId}")]
    public async Task<IActionResult> UpdateEvent(int eventId, [FromBody] TimelineEvent timelineEvent)
    {
        if (eventId != timelineEvent.Id)
            return BadRequest();
        await _timelineService.UpdateEventAsync(timelineEvent);
        return Ok();
    }

    [HttpDelete("events/{eventId}")]
    public async Task<IActionResult> DeleteEvent(int eventId)
    {
        await _timelineService.DeleteEventAsync(eventId);
        return Ok();
    }

    // Sharing endpoints
    [HttpPost("share")]
    public async Task<IActionResult> ShareTimeline([FromQuery] int timelineId, [FromQuery] int userId)
    {
        await _timelineService.ShareTimelineAsync(timelineId, userId);
        return Ok();
    }

    [HttpDelete("share")]
    public async Task<IActionResult> UnshareTimeline([FromQuery] int timelineId, [FromQuery] int userId)
    {
        await _timelineService.UnshareTimelineAsync(timelineId, userId);
        return Ok();
    }
}
