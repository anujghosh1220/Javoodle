# Event Catalog
xp.awarded{amount,source} · level.up{level,rank} · mission.started{missionId} · mission.completed{missionId,xp} · achievement.unlocked{code,title} · code.execution.started/succeeded/failed · lesson.completed · student.returned
Emitters: MissionWorkspace.submit (verified server response only). Consumers: ExperienceEffects (wave), XPReactor (pulse+count), LevelUpOverlay (level.up→emitRobotEvent celebrating), UnlockToast (celebrating).
