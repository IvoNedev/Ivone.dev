using System.Collections.Generic;
using System.Threading.Tasks;

public interface ITimelineService
{
    // Timeline management
    Task<List<Timeline>> GetTimelinesForUserAsync(int userId);
    Task<Timeline> GetTimelineByIdAsync(int timelineId);
    Task AddTimelineAsync(Timeline timeline);
    Task UpdateTimelineAsync(Timeline timeline);
    Task DeleteTimelineAsync(int timelineId);

    // Timeline event management
    Task<List<TimelineEvent>> GetEventsByTimelineAsync(int timelineId);
    Task AddEventAsync(TimelineEvent timelineEvent);
    Task UpdateEventAsync(TimelineEvent timelineEvent);
    Task DeleteEventAsync(int eventId);

    // Sharing functionality
    Task ShareTimelineAsync(int timelineId, int userId);
    Task UnshareTimelineAsync(int timelineId, int userId);
}
