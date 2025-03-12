using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using ivone.dev.Services.Interfaces;

namespace ivone.dev.Web.Controllers
{
    [Route("api/users")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _service;

        public UsersController(IUserService service)
        {
            _service = service;
        }

        // ✅ Get all users
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _service.GetAllAsync();
            return Ok(users);
        }

        // ✅ Get user by ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _service.GetByIdAsync(id);
            if (user == null) return NotFound();
            return Ok(user);
        }

        // New endpoint: Get user by email
        [HttpGet("byEmail")]
        public async Task<IActionResult> GetByEmail([FromQuery] string email)
        {
            var user = await _service.GetByEmailAsync(email);
            if (user == null) return NotFound();
            return Ok(user);
        }

        // ✅ Add a new user (HasPaid defaults to false)
        [HttpPost]
        public async Task<IActionResult> Add([FromBody] User user)
        {
            await _service.AddAsync(user);
            return Ok();
        }

        // ✅ Update an existing user
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] User user)
        {
            user.Id = id;  // Ensure correct ID assignment
            await _service.UpdateAsync(user);
            return Ok();
        }

        // ✅ Delete a user
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return Ok();
        }
    }
}
