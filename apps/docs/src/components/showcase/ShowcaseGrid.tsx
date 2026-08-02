import BookDemoCard from "./BookDemoCard";
import StatusRow from "./StatusRow";
import EditorSettings from "./EditorSettings";
import DocsNav from "./DocsNav";
import CodePreviewToggle from "./CodePreviewToggle";
import CommandShortcuts from "./CommandShortcuts";
import AvatarGroup from "./AvatarGroup";
import AccountMenu from "./AccountMenu";
import ButtonVariants from "./ButtonVariants";
import InstallCard from "./InstallCard";
import RepoCard from "./RepoCard";
import PlatformCards from "./PlatformCards";
import UpdateBanner from "./UpdateBanner";
import NotificationToggle from "./NotificationToggle";
import UnsavedChangesCard from "./UnsavedChangesCard";

/** Homepage showcase cards in one island — one IntersectionObserver and
 *  one React root instead of fifteen separate `client:visible` islands. */
export default function ShowcaseGrid() {
  return (
    <>
      <BookDemoCard />
      <StatusRow />
      <EditorSettings />
      <DocsNav />
      <CodePreviewToggle />
      <CommandShortcuts />
      <AvatarGroup />
      <AccountMenu />
      <ButtonVariants />
      <InstallCard />
      <RepoCard />
      <PlatformCards />
      <UpdateBanner />
      <NotificationToggle />
      <UnsavedChangesCard />
    </>
  );
}
