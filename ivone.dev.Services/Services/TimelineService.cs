using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ivone.dev.Data.Contexts;
using ivone.dev.Services.Interfaces;

namespace ivone.dev.Services
{
    public class TimelineService : BaseService<Timeline>, ITimelineService
    {
        private readonly AppDbContext _context;

        public TimelineService(AppDbContext context) : base(context)
        {
            _context = context;
        }

        // Ensure that a default timeline exists for the user
        public async Task<List<Timeline>> GetTimelinesForUserAsync(int userId)
        {
            // Retrieve timelines where the user is the owner or it has been shared with them.
            List<Timeline> timelines = null;
            try
            {
                timelines = await _context.Set<Timeline>()
                    .Include(t => t.TimelineEvents)
                    .Include(t => t.UserTimelines)
                    .Where(t => t.OwnerId == userId || t.UserTimelines.Any(ut => ut.UserId == userId))
                    .ToListAsync();
            }
            catch(Exception ex)
            {
                string exx = ex.Message;
            }

            // If no timelines exist for the user, create a default timeline.
            if (timelines == null || timelines.Count == 0)
            {
                var defaultTimeline = new Timeline
                {
                    Name = "Default Timeline",
                    OwnerId = userId,
                    CreatedOn = DateTime.UtcNow
                };

                await _context.Set<Timeline>().AddAsync(defaultTimeline);
                await _context.SaveChangesAsync();

                // Add the newly created timeline to the result list.
                timelines.Add(defaultTimeline);
            }
            return timelines;
        }

        public async Task<Timeline> GetTimelineByIdAsync(int timelineId)
        {
            var tml = await _context.Set<Timeline>()
                .Include(t => t.TimelineEvents)
                .FirstOrDefaultAsync(t => t.Id == timelineId);

            return tml;
        }

        public async Task AddTimelineAsync(Timeline timeline)
        {
            await _context.Set<Timeline>().AddAsync(timeline);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateTimelineAsync(Timeline timeline)
        {
            _context.Set<Timeline>().Update(timeline);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteTimelineAsync(int timelineId)
        {
            var timeline = await GetTimelineByIdAsync(timelineId);
            if (timeline != null)
            {
                _context.Set<Timeline>().Remove(timeline);
                await _context.SaveChangesAsync();
            }
        }

        // Timeline event management
        public async Task<List<TimelineEvent>> GetEventsByTimelineAsync(int timelineId)
        {
            return await _context.Set<TimelineEvent>()
                .Where(e => e.TimelineId == timelineId)
                .ToListAsync();
        }

        public async Task AddEventAsync(TimelineEvent timelineEvent)
        {
            await _context.Set<TimelineEvent>().AddAsync(timelineEvent);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateEventAsync(TimelineEvent timelineEvent)
        {
            _context.Set<TimelineEvent>().Update(timelineEvent);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteEventAsync(int eventId)
        {
            var timelineEvent = await _context.Set<TimelineEvent>().FindAsync(eventId);
            if (timelineEvent != null)
            {
                _context.Set<TimelineEvent>().Remove(timelineEvent);
                await _context.SaveChangesAsync();
            }
        }

        // Sharing functionality
        public async Task ShareTimelineAsync(int timelineId, int userId)
        {
            var shareEntry = new UserTimeline { TimelineId = timelineId, UserId = userId };
            await _context.Set<UserTimeline>().AddAsync(shareEntry);
            await _context.SaveChangesAsync();
        }

        public async Task UnshareTimelineAsync(int timelineId, int userId)
        {
            var shareEntry = await _context.Set<UserTimeline>()
                .FirstOrDefaultAsync(ut => ut.TimelineId == timelineId && ut.UserId == userId);
            if (shareEntry != null)
            {
                _context.Set<UserTimeline>().Remove(shareEntry);
                await _context.SaveChangesAsync();
            }
        }
    }
}
