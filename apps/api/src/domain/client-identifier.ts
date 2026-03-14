/**
 * ClientIdentifier 値オブジェクト
 *
 * 匿名ユーザーの識別ハッシュを表現する。
 * 生IPは保持せず、SHA-256ハッシュのみを扱う。
 */
export class ClientIdentifier {
  private constructor(readonly hash: string) {}

  /**
   * SHA-256(IP + Cookie_ID + User-Agent) でクライアント識別子を生成する。
   * Cookie同意拒否時（cookieId が undefined）は IP + User-Agent のみで生成。
   *
   * 注意: 引数の ip は本メソッド内でのみ使用され、外部に露出しない。
   */
  static async create(
    ip: string,
    userAgent: string,
    cookieId?: string,
  ): Promise<ClientIdentifier> {
    const parts = cookieId ? [ip, cookieId, userAgent] : [ip, userAgent];
    const raw = parts.join("|");

    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const digest = await crypto.subtle.digest("SHA-256", data);

    const hashArray = Array.from(new Uint8Array(digest));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return new ClientIdentifier(hash);
  }

  toString(): string {
    return this.hash;
  }

  equals(other: ClientIdentifier): boolean {
    return this.hash === other.hash;
  }
}
