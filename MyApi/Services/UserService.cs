using MyApi.Data;
using MyApi.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace MyApi.Services
{
    public class UserService
    {
        private readonly AppDbContext _db;
        public UserService(AppDbContext db) { _db = db; }

        public async Task<User> CreateUser(string name, string email, string password, Role role)
        {
            var exists = await _db.Users.AnyAsync(u => u.Email == email);
            if (exists) return null;

            var user = new User
            {
                Name = name,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Role = role,
                RmId = role == Role.RM ? Guid.NewGuid().ToString() : null
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            return user;
        }

        public async Task<User> Authenticate(string email, string password)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                return null;
            return user;
        }

        public async Task<User> ToggleActive(int id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return null;

            user.IsActive = !user.IsActive;
            await _db.SaveChangesAsync();
            return user;
        }

        public async Task<User> ArchiveUser(int id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return null;

            user.IsArchived = true;
            await _db.SaveChangesAsync();
            return user;
        }

        public async Task<User> TransferRole(int id, Role newRole)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return null;

            user.Role = newRole;
            await _db.SaveChangesAsync();
            return user;
        }

        public async Task<List<User>> GetAllUsers()
        {
            return await _db.Users.ToListAsync();
        }
    }
}
