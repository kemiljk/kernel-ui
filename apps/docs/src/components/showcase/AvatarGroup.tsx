import { Avatar } from "@kernelui-lib/react";

export default function AvatarGroup() {
  return (
    <div className="showcase-item">
      <h3>Contributors</h3>
      <div className="showcase-avatar-group">
        <Avatar
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces&auto=format"
          alt="Contributor Aisha K."
          fallback="AK"
        />
        <Avatar
          src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces&auto=format"
          alt="Contributor Marco B."
          fallback="MB"
        />
        <Avatar
          src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=faces&auto=format"
          alt="Contributor Chidi D."
          fallback="CD"
        />
        <Avatar
          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=faces&auto=format"
          alt="Contributor Elena F."
          fallback="EF"
        />
        <Avatar fallback="+5" />
      </div>
    </div>
  );
}
