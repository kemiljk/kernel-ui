import { Avatar } from "@kernelui-lib/react";

export default function AvatarDemo() {
  return (
    <>
      <Avatar src="/karl-square.png" alt="" fallback="AL" />
      <Avatar fallback="KK" />
      <Avatar fallback="DX" />
    </>
  );
}
