/**
 * Vertically centre `el` within its scroll container `container`, scrolling
 * only that container.
 *
 * Use this instead of el.scrollIntoView() inside the slide-in panels.
 * scrollIntoView also scrolls every ancestor scroll container, including
 * `overflow-hidden` ones, and with its default inline: 'nearest' it can
 * scroll the chat row sideways while the panel is still translated
 * off-screen. Users can't scroll that back.
 */
export function centerInScrollContainer(
	container: HTMLElement,
	el: HTMLElement,
): void {
	const offset =
		el.getBoundingClientRect().top - container.getBoundingClientRect().top;
	container.scrollTop +=
		offset - (container.clientHeight - el.offsetHeight) / 2;
}
