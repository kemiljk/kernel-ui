import BookDemoCard from "./BookDemoCard";
import DocsNav from "./DocsNav";
import InstallCard from "./InstallCard";
import StatusRow from "./StatusRow";
import CommandShortcuts from "./CommandShortcuts";
import UnsavedChangesCard from "./UnsavedChangesCard";

/** Homepage showcase cards in one island — one IntersectionObserver and
 *  one React root instead of six separate `client:visible` islands.
 *
 *  Six pieces, deliberately, and every one of them a *composition*: the
 *  section heading promises "real screens", so a lone Switch, an avatar
 *  row, or a grid of Button variants actively works against it — those
 *  are a component zoo, which is the thing this section exists to prove
 *  Kernel isn't. The bar for adding a seventh is "a real product would
 *  ship this exact block", not "we have another component to show".
 *  Single components belong on their own /components page, where the
 *  reader has come specifically to see one in isolation. */
export default function ShowcaseGrid() {
  return (
    <>
      <BookDemoCard />
      <DocsNav />
      <InstallCard />
      <StatusRow />
      <CommandShortcuts />
      <UnsavedChangesCard />
    </>
  );
}
