import ArticleEditor from "../[id]/page";

export const metadata = { title: "مقال جديد" };

export default function NewArticle() {
  return <ArticleEditor params={Promise.resolve({ id: "new" })} />;
}
