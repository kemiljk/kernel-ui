import { Avatar } from "@kernelui-lib/react";

export default function AvatarGroup() {
  return (
    <div className="showcase-item">
      <h3>Contributors</h3>
      <div className="showcase-avatar-group">
        <Avatar fallback="KK" />
        <Avatar fallback="AB" />
        <Avatar fallback="CD" />
        <Avatar fallback="EF" />
        <Avatar fallback="+5" />
      </div>
    </div>
  );
}
