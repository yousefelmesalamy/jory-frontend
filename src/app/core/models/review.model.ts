/** The reviewer as `ReviewSerializer` embeds it — never the full `User`. */
export interface ReviewAuthor {
  id: number;
  full_name: string;
}

/** `GET/POST /api/products/{slug}/reviews/` — one published review. */
export interface Review {
  id: number;
  user: ReviewAuthor;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}
