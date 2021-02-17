﻿using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

#nullable disable

namespace Skyra.Database.Models
{
	[Table("user")]
	public partial class User
	{
		public User()
		{
			UserGameIntegrations = new HashSet<UserGameIntegration>();
			UserSpousesUserUserId1Navigations = new HashSet<UserSpousesUser>();
			UserSpousesUserUserId2Navigations = new HashSet<UserSpousesUser>();
		}

		[Key]
		[Column("id")]
		[StringLength(19)]
		public string Id { get; set; }
		[Column("points")]
		public int Points { get; set; }
		[Column("reputations")]
		public int Reputations { get; set; }
		[Required]
		[Column("moderation_dm")]
		public bool? ModerationDm { get; set; }
		[Column("money")]
		public long Money { get; set; }

		[InverseProperty("User")]
		public virtual RpgUser RpgUser { get; set; }
		[InverseProperty("User")]
		public virtual UserCooldown UserCooldown { get; set; }
		[InverseProperty("User")]
		public virtual UserProfile UserProfile { get; set; }
		[InverseProperty(nameof(UserGameIntegration.User))]
		public virtual ICollection<UserGameIntegration> UserGameIntegrations { get; set; }
		[InverseProperty(nameof(UserSpousesUser.UserId1Navigation))]
		public virtual ICollection<UserSpousesUser> UserSpousesUserUserId1Navigations { get; set; }
		[InverseProperty(nameof(UserSpousesUser.UserId2Navigation))]
		public virtual ICollection<UserSpousesUser> UserSpousesUserUserId2Navigations { get; set; }
	}
}