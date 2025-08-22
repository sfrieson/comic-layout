# Notes

Explaining the direction of the app. Living document.

## Definitions

A **Project** is a container of pages. (Undecided) It may have extra image about UI state like page outline color, page render location, canvas background color, etc. It also holds meta data like the name of the project and created/updated dates.

A **Page** is a root render target. A page is a root node in a tree/graph of nodes. A page is the normal exported unit. A page has many other child nodes. A page is not a node in and of itself or is a special case node, the root node.
<comment>
Does a page have a transform of origin, no rotation and 1 scale or does it have no transform at all? Should a page have a root node?
</comment>

A **Node** is a renderable item. It has a transform relative to its parent unless otherwise noted.
<comment>
Is it actually possible to have a transform relative to some other than it's parent?
If a node wants to be relative to a node inside the same page, that seems like it's just a group of nodes and not an issue.
If a node wants to be relative to a node in a different page, then how does the transform work? It would need some relativity at the project level, and I'm not ssure that makes sense.
Maybe there's a page agnostic anchor that an item on any page can be relative to. This implies that a Project is necessary as a container though still an organizing/facilitating unit. Maybe other global items could be guides. Maybe even page size/crops.
</comment>
