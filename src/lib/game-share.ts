/**
 * Homepage game-share links — one formula, reused exactly.
 *
 * The play URL and caption below are the SAME formula the live
 * play-page ShareGameButton already uses:
 *   play URL: {origin}/{locale}/activity/{gameId}/play
 *   caption:  "Play {gameTitle} on EduPlay: {playUrl}"
 * The origin defaults to the live site when the caller has no window
 * (server render); the browser caller passes window.location.origin.
 * Nothing here shortens, tracks, or invents a URL: the shared link is
 * always the game's real play URL, and sharing a public game needs no
 * account and no new endpoint.
 *
 * WhatsApp and Facebook use their real sharer links (the same pattern
 * the live-room host share already uses). Instagram deliberately has
 * NO link builder here: there is no web URL scheme for posting a link
 * to Instagram, so inventing an "instagram sharer" URL would be a fake
 * link. For Instagram the control only copies the link/caption, and
 * says so plainly — copy it, then paste it on Instagram.
 */

/** The game's real play URL — never shortened, never tracked. */
export function gamePlayUrl(locale: string, gameId: string, origin = 'https://eduplay-self.vercel.app'): string {
  return `${origin}/${locale}/activity/${gameId}/play`
}

/** The ready caption that travels with the link. */
export function gameShareText(gameTitle: string, playUrl: string): string {
  return `Play ${gameTitle} on EduPlay: ${playUrl}`
}

/** Real WhatsApp share link: wa.me with the caption as its text. */
export function whatsappShareUrl(shareText: string): string {
  return `https://wa.me/?text=${encodeURIComponent(shareText)}`
}

/** Real Facebook sharer link for the game's play URL. */
export function facebookShareUrl(playUrl: string, shareText: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(playUrl)}&quote=${encodeURIComponent(shareText)}`
}

/**
 * Share-control gate: a card shows a share control ONLY when the game
 * is explicitly public. Anything else — false, missing, null — gets
 * no share control, so a private game can never gain one by omission.
 */
export function shouldShowShare(isPublic: boolean | undefined | null): boolean {
  return isPublic === true
}
