import { Avatar } from "@kernelui/react";

export default function AvatarDemo() {
  return (
    <>
      <Avatar src="/does-not-exist.jpg" alt="" fallback="AL" />
      <Avatar fallback="KK" />
      <Avatar fallback="DX" />
    </>
  );
}
