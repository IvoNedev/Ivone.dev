using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ivone.dev.Pages
{
    public class TimelineModel : PageModel
    {
        private readonly ITimelineService _timelineService;
        private readonly ILogger<TimelineModel> _logger;

        public TimelineModel(ILogger<TimelineModel> logger, ITimelineService timelineService)
        {
            _logger = logger;
            _timelineService = timelineService;
        }

        // New properties to hold timelines and events
        public List<Timeline> Timelines { get; set; }
        public Timeline SelectedTimeline { get; set; }
        public List<TimelineEvent> TimelineEvents { get; set; }

        public async Task OnGetAsync()
        {
            // Retrieve current user's ID.
            // In a real app, extract this from the authentication context/claims.
            int userId = 1;  // Example: using user ID 1 for demonstration.

            // Fetch all timelines available to the user (owned or shared)
            Timelines = await _timelineService.GetTimelinesForUserAsync(userId);

            if (Timelines != null && Timelines.Any())
            {
                // For now, select the first timeline.
                SelectedTimeline = Timelines.First();

                // Load events for the selected timeline.
                TimelineEvents = await _timelineService.GetEventsByTimelineAsync(SelectedTimeline.Id);
            }
            else
            {
                TimelineEvents = new List<TimelineEvent>();
            }
        }
    }
}
