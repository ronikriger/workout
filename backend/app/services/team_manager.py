"""
Team Management Service - Advanced team operations and analytics
Handles team creation, member management, challenges, leaderboards, and team analytics
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_

from ..models.user import User
from ..models.trainer import (
    Team, Challenge, Leaderboard, LeaderboardEntry, ChallengeProgress,
    TeamInvitation, Trainer,
    ChallengeStatus, ChallengeType, ChallengeMetric, InvitationStatus
)


class TeamManager:
    """Comprehensive team management and analytics service"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_team_leaderboard(
        self,
        team_id: str,
        name: str,
        metric: ChallengeMetric,
        period: str = "weekly"
    ) -> Leaderboard:
        """Create a leaderboard for a team"""
        
        leaderboard = Leaderboard(
            name=name,
            description=f"Team leaderboard for {metric.value} ({period})",
            type="team",
            metric=metric,
            period=period,
            team_id=team_id
        )
        
        self.db.add(leaderboard)
        self.db.commit()
        self.db.refresh(leaderboard)
        
        # Initialize with current team members
        await self._update_leaderboard_entries(leaderboard.id)
        
        return leaderboard
    
    async def update_team_leaderboards(self, team_id: str) -> None:
        """Update all leaderboards for a team"""
        
        leaderboards = self.db.query(Leaderboard).filter(
            Leaderboard.team_id == team_id,
            Leaderboard.is_active == True
        ).all()
        
        for leaderboard in leaderboards:
            await self._update_leaderboard_entries(leaderboard.id)
    
    async def _update_leaderboard_entries(self, leaderboard_id: str) -> None:
        """Update entries for a specific leaderboard"""
        
        leaderboard = self.db.query(Leaderboard).filter(
            Leaderboard.id == leaderboard_id
        ).first()
        
        if not leaderboard or not leaderboard.team_id:
            return
        
        # Get team members
        team = self.db.query(Team).filter(Team.id == leaderboard.team_id).first()
        if not team:
            return
        
        # Calculate scores based on metric and period
        member_scores = await self._calculate_member_scores(
            team.members,
            leaderboard.metric,
            leaderboard.period
        )
        
        # Clear existing entries
        self.db.query(LeaderboardEntry).filter(
            LeaderboardEntry.leaderboard_id == leaderboard_id
        ).delete()
        
        # Create new entries
        for rank, (user_id, score) in enumerate(member_scores, 1):
            entry = LeaderboardEntry(
                leaderboard_id=leaderboard_id,
                user_id=user_id,
                rank=rank,
                score=score,
                rank_change=0  # Would calculate from previous period
            )
            self.db.add(entry)
        
        leaderboard.last_updated = datetime.utcnow()
        self.db.commit()
    
    async def _calculate_member_scores(
        self,
        members: List[User],
        metric: ChallengeMetric,
        period: str
    ) -> List[Tuple[str, float]]:
        """Calculate scores for team members based on metric and period"""
        
        # Calculate date range based on period
        now = datetime.utcnow()
        if period == "daily":
            start_date = now - timedelta(days=1)
        elif period == "weekly":
            start_date = now - timedelta(days=7)
        elif period == "monthly":
            start_date = now - timedelta(days=30)
        else:  # all_time
            start_date = datetime.min
        
        member_scores = []
        
        for member in members:
            score = await self._calculate_user_metric_score(
                member.id, metric, start_date, now
            )
            member_scores.append((member.id, score))
        
        # Sort by score (descending)
        member_scores.sort(key=lambda x: x[1], reverse=True)
        
        return member_scores
    
    async def _calculate_user_metric_score(
        self,
        user_id: str,
        metric: ChallengeMetric,
        start_date: datetime,
        end_date: datetime
    ) -> float:
        """Calculate a user's score for a specific metric"""
        
        # This would integrate with your workout session data
        # For now, returning mock calculations
        
        if metric == ChallengeMetric.FORM_SCORE:
            # Average form score from workout sessions
            # Mock: return random score between 70-95
            import random
            return random.uniform(70, 95)
        
        elif metric == ChallengeMetric.TOTAL_REPS:
            # Total reps from workout sessions
            # Mock: return random reps between 100-500
            import random
            return random.randint(100, 500)
        
        elif metric == ChallengeMetric.CONSISTENCY:
            # Days with workouts / total days * 100
            # Mock: return random consistency between 40-90
            import random
            return random.uniform(40, 90)
        
        elif metric == ChallengeMetric.IMPROVEMENT:
            # Improvement in form score over period
            # Mock: return random improvement between -5 to +15
            import random
            return random.uniform(-5, 15)
        
        return 0.0
    
    async def create_team_challenge(
        self,
        trainer_id: str,
        team_id: str,
        title: str,
        description: str,
        metric: ChallengeMetric,
        target_value: float,
        duration_days: int,
        rewards: List[str] = None
    ) -> Challenge:
        """Create a team challenge"""
        
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=duration_days)
        
        challenge = Challenge(
            title=title,
            description=description,
            type=ChallengeType.TEAM,
            metric=metric,
            target_value=target_value,
            duration_days=duration_days,
            start_date=start_date,
            end_date=end_date,
            rewards=rewards or [],
            created_by_trainer_id=trainer_id,
            team_id=team_id,
            status=ChallengeStatus.ACTIVE
        )
        
        self.db.add(challenge)
        self.db.commit()
        self.db.refresh(challenge)
        
        # Add all team members as participants
        team = self.db.query(Team).filter(Team.id == team_id).first()
        if team:
            for member in team.members:
                progress = ChallengeProgress(
                    challenge_id=challenge.id,
                    participant_id=member.id,
                    target_value=target_value,
                    current_value=0.0
                )
                self.db.add(progress)
        
        self.db.commit()
        
        return challenge
    
    async def update_challenge_progress(
        self,
        challenge_id: str,
        user_id: str,
        new_value: float
    ) -> ChallengeProgress:
        """Update a user's progress in a challenge"""
        
        progress = self.db.query(ChallengeProgress).filter(
            ChallengeProgress.challenge_id == challenge_id,
            ChallengeProgress.participant_id == user_id
        ).first()
        
        if not progress:
            # Create new progress entry
            challenge = self.db.query(Challenge).filter(Challenge.id == challenge_id).first()
            if not challenge:
                raise ValueError("Challenge not found")
            
            progress = ChallengeProgress(
                challenge_id=challenge_id,
                participant_id=user_id,
                target_value=challenge.target_value,
                current_value=new_value
            )
            self.db.add(progress)
        else:
            progress.current_value = new_value
            progress.updated_at = datetime.utcnow()
        
        # Check if challenge is completed
        if new_value >= progress.target_value and not progress.is_completed:
            progress.is_completed = True
            progress.completed_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(progress)
        
        # Update rankings
        await self._update_challenge_rankings(challenge_id)
        
        return progress
    
    async def _update_challenge_rankings(self, challenge_id: str) -> None:
        """Update rankings for a challenge"""
        
        progress_entries = self.db.query(ChallengeProgress).filter(
            ChallengeProgress.challenge_id == challenge_id
        ).order_by(desc(ChallengeProgress.current_value)).all()
        
        for rank, progress in enumerate(progress_entries, 1):
            progress.rank = rank
        
        self.db.commit()
    
    async def get_team_analytics(
        self,
        team_id: str,
        period_days: int = 30
    ) -> Dict:
        """Get comprehensive team analytics"""
        
        team = self.db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise ValueError("Team not found")
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)
        
        analytics = {
            "team_info": {
                "id": team.id,
                "name": team.name,
                "member_count": len(team.members),
                "created_at": team.created_at
            },
            "performance_metrics": await self._get_team_performance_metrics(team_id, start_date, end_date),
            "member_analytics": await self._get_member_analytics(team.members, start_date, end_date),
            "challenge_progress": await self._get_team_challenge_progress(team_id),
            "leaderboard_standings": await self._get_team_leaderboard_standings(team_id),
            "activity_trends": await self._get_team_activity_trends(team_id, start_date, end_date)
        }
        
        return analytics
    
    async def _get_team_performance_metrics(
        self,
        team_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """Calculate team performance metrics"""
        
        team = self.db.query(Team).filter(Team.id == team_id).first()
        if not team:
            return {}
        
        # Mock calculations - would integrate with actual workout data
        total_workouts = len(team.members) * 10  # Mock: avg 10 workouts per member
        avg_form_score = 85.5  # Mock average
        total_reps = sum(range(100, 600, 50))  # Mock total reps
        active_members = len([m for m in team.members if m.is_active])
        
        # Find top performer (mock)
        top_performer = team.members[0].username if team.members else "None"
        
        # Calculate goal completion (mock)
        weekly_goal_completion = 75.0  # Mock percentage
        
        return {
            "total_workouts": total_workouts,
            "average_form_score": avg_form_score,
            "total_reps": total_reps,
            "active_members": active_members,
            "top_performer": top_performer,
            "weekly_goal_completion": weekly_goal_completion,
            "improvement_rate": 12.5,  # Mock improvement percentage
            "consistency_score": 80.0   # Mock consistency score
        }
    
    async def _get_member_analytics(
        self,
        members: List[User],
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """Get analytics for each team member"""
        
        member_analytics = []
        
        for member in members:
            # Mock member analytics - would use real workout data
            analytics = {
                "user_id": member.id,
                "username": member.username,
                "workouts_completed": 8,  # Mock
                "avg_form_score": 87.2,   # Mock
                "total_reps": 245,        # Mock
                "consistency_days": 6,    # Mock
                "improvement_rate": 8.5,  # Mock
                "rank_change": 0,         # Mock
                "achievements": ["Form Master", "Consistency Champion"]  # Mock
            }
            member_analytics.append(analytics)
        
        return member_analytics
    
    async def _get_team_challenge_progress(self, team_id: str) -> List[Dict]:
        """Get progress on active team challenges"""
        
        challenges = self.db.query(Challenge).filter(
            Challenge.team_id == team_id,
            Challenge.status == ChallengeStatus.ACTIVE
        ).all()
        
        challenge_progress = []
        
        for challenge in challenges:
            # Calculate team progress
            progress_entries = self.db.query(ChallengeProgress).filter(
                ChallengeProgress.challenge_id == challenge.id
            ).all()
            
            if challenge.type == ChallengeType.TEAM:
                # For team challenges, sum all member progress
                total_progress = sum(p.current_value for p in progress_entries)
                progress_percentage = min(100, (total_progress / challenge.target_value) * 100)
            else:
                # For individual challenges, calculate average completion
                completed = sum(1 for p in progress_entries if p.is_completed)
                progress_percentage = (completed / len(progress_entries)) * 100 if progress_entries else 0
            
            challenge_data = {
                "challenge_id": challenge.id,
                "title": challenge.title,
                "type": challenge.type.value,
                "metric": challenge.metric.value,
                "progress_percentage": progress_percentage,
                "participants": len(progress_entries),
                "completed_participants": sum(1 for p in progress_entries if p.is_completed),
                "days_remaining": (challenge.end_date - datetime.utcnow()).days,
                "rewards": challenge.rewards
            }
            challenge_progress.append(challenge_data)
        
        return challenge_progress
    
    async def _get_team_leaderboard_standings(self, team_id: str) -> List[Dict]:
        """Get team's standings in various leaderboards"""
        
        leaderboards = self.db.query(Leaderboard).filter(
            Leaderboard.team_id == team_id,
            Leaderboard.is_active == True
        ).all()
        
        standings = []
        
        for leaderboard in leaderboards:
            entries = self.db.query(LeaderboardEntry).filter(
                LeaderboardEntry.leaderboard_id == leaderboard.id
            ).order_by(LeaderboardEntry.rank).limit(10).all()
            
            leaderboard_data = {
                "leaderboard_id": leaderboard.id,
                "name": leaderboard.name,
                "metric": leaderboard.metric.value,
                "period": leaderboard.period,
                "top_entries": [
                    {
                        "rank": entry.rank,
                        "user_id": entry.user_id,
                        "score": entry.score,
                        "rank_change": entry.rank_change
                    }
                    for entry in entries
                ]
            }
            standings.append(leaderboard_data)
        
        return standings
    
    async def _get_team_activity_trends(
        self,
        team_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """Get team activity trends over time"""
        
        # Mock trend data - would calculate from actual workout sessions
        trends = []
        current_date = start_date
        
        while current_date <= end_date:
            trend_data = {
                "date": current_date.isoformat(),
                "active_members": 8,    # Mock
                "total_workouts": 12,   # Mock
                "avg_form_score": 85.0, # Mock
                "total_reps": 240       # Mock
            }
            trends.append(trend_data)
            current_date += timedelta(days=1)
        
        return trends
    
    async def invite_members_bulk(
        self,
        team_id: str,
        trainer_id: str,
        invitations: List[Dict]
    ) -> List[TeamInvitation]:
        """Send bulk invitations to join a team"""
        
        team = self.db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise ValueError("Team not found")
        
        created_invitations = []
        
        for invitation_data in invitations:
            # Check if invitation already exists
            existing = self.db.query(TeamInvitation).filter(
                TeamInvitation.team_id == team_id,
                TeamInvitation.invitee_email == invitation_data["email"],
                TeamInvitation.status == InvitationStatus.PENDING
            ).first()
            
            if existing:
                continue  # Skip if already invited
            
            invitation = TeamInvitation(
                team_id=team_id,
                trainer_id=trainer_id,
                invitee_email=invitation_data["email"],
                invitee_name=invitation_data.get("name"),
                message=invitation_data.get("message", ""),
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            
            self.db.add(invitation)
            created_invitations.append(invitation)
        
        self.db.commit()
        
        # Refresh all invitations
        for invitation in created_invitations:
            self.db.refresh(invitation)
        
        return created_invitations
    
    async def process_invitation_response(
        self,
        invitation_id: str,
        user_id: str,
        accept: bool
    ) -> TeamInvitation:
        """Process a user's response to a team invitation"""
        
        invitation = self.db.query(TeamInvitation).filter(
            TeamInvitation.id == invitation_id
        ).first()
        
        if not invitation:
            raise ValueError("Invitation not found")
        
        if invitation.status != InvitationStatus.PENDING:
            raise ValueError("Invitation already processed")
        
        if invitation.expires_at < datetime.utcnow():
            invitation.status = InvitationStatus.EXPIRED
            self.db.commit()
            raise ValueError("Invitation has expired")
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or user.email != invitation.invitee_email:
            raise ValueError("User not authorized for this invitation")
        
        if accept:
            # Add user to team
            team = self.db.query(Team).filter(Team.id == invitation.team_id).first()
            if team and user not in team.members:
                team.members.append(user)
            
            invitation.status = InvitationStatus.ACCEPTED
        else:
            invitation.status = InvitationStatus.DECLINED
        
        invitation.responded_at = datetime.utcnow()
        self.db.commit()
        
        return invitation
    
    async def get_team_comparison(
        self,
        team_ids: List[str],
        metric: ChallengeMetric,
        period_days: int = 30
    ) -> Dict:
        """Compare multiple teams on a specific metric"""
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)
        
        comparison_data = {
            "metric": metric.value,
            "period_days": period_days,
            "teams": []
        }
        
        for team_id in team_ids:
            team = self.db.query(Team).filter(Team.id == team_id).first()
            if not team:
                continue
            
            # Calculate team score for the metric
            team_score = await self._calculate_team_metric_score(
                team_id, metric, start_date, end_date
            )
            
            team_data = {
                "team_id": team_id,
                "team_name": team.name,
                "member_count": len(team.members),
                "score": team_score,
                "trainer_name": f"{team.trainer.user.first_name} {team.trainer.user.last_name}"
            }
            comparison_data["teams"].append(team_data)
        
        # Sort teams by score (descending)
        comparison_data["teams"].sort(key=lambda x: x["score"], reverse=True)
        
        return comparison_data
    
    async def _calculate_team_metric_score(
        self,
        team_id: str,
        metric: ChallengeMetric,
        start_date: datetime,
        end_date: datetime
    ) -> float:
        """Calculate a team's score for a specific metric"""
        
        team = self.db.query(Team).filter(Team.id == team_id).first()
        if not team:
            return 0.0
        
        member_scores = []
        for member in team.members:
            score = await self._calculate_user_metric_score(
                member.id, metric, start_date, end_date
            )
            member_scores.append(score)
        
        if not member_scores:
            return 0.0
        
        # Return average score for the team
        return sum(member_scores) / len(member_scores) 