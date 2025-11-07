import { InMemoryCache } from "@apollo/client";
import { ApolloClient, gql, HttpLink } from "@apollo/client";
// dotenv
import dotenv from "dotenv";
dotenv.config();

export const WIKIJS_HOST = process.env.WIKIJS_HOST || "http://localhost:3000";
export const WIKIJS_API_TOKEN = process.env.WIKIJS_API_TOKEN || "";
export const WIKIJS_LOCALE = process.env.WIKIJS_LOCALE || "en";

if (!WIKIJS_HOST || !WIKIJS_API_TOKEN) {
  throw new Error(
    "WIKIJS_HOST or WIKIJS_API_TOKEN is not set in environment variables"
  );
}

export class WikiJSClient {
  private client: ApolloClient;
  private locale: string = WIKIJS_LOCALE;

  constructor() {
    this.client = new ApolloClient({
      link: new HttpLink({
        uri: `${WIKIJS_HOST}/graphql`,
        headers: {
          Authorization: `Bearer ${WIKIJS_API_TOKEN}`,
        },
      }),
      cache: new InMemoryCache(),
    });
  }

  async getPageList() {
    const result = await this.client.query<{
      pages: {
        list: {
          id: number;
          title: string;
          description: string;
        }[];
      };
    }>({
      query: gql`
        query GetPageList {
          pages {
            list {
              id
              title
              description
            }
          }
        }
      `,
    });

    if (!result.data || !result.data.pages) {
      throw new Error("Failed to fetch page list from WikiJS");
    }

    return result.data.pages.list;
  }

  async getPageById(pageId: number) {
    const result = await this.client.query<{
      pages: {
        single: {
          id: number;
          title: string;
          content: string;
        };
      };
    }>({
      query: gql`
        query GetPageContent($id: Int!) {
          pages {
            single(id: $id) {
              id
              title
              content
            }
          }
        }
      `,
      variables: {
        id: pageId,
      },
    });

    if (!result.data || !result.data.pages) {
      throw new Error(`Failed to fetch content for page ID ${pageId}`);
    }

    return result.data.pages.single;
  }

  async updatePageDescription(pageId: number, newDescription: string) {
    // 元のページ情報を取得して保持
    const originalPage = await this.client.query<{
      pages: {
        single: {
          id: number;
          content: string;
          description: string;
          editor: string;
          isPrivate: boolean;
          isPublished: boolean;
          locale: string;
          path: string;
          publishEndDate: string;
          publishStartDate: string;
          scriptCss: string;
          scriptJs: string;
          tags: { id: number; tag: string; title: string }[];
          title: string;
        };
      };
    }>({
      query: gql`
        query GetPageDescription($id: Int!) {
          pages {
            single(id: $id) {
              id
              content
              description
              editor
              isPrivate
              isPublished
              locale
              path
              publishEndDate
              publishStartDate
              scriptCss
              scriptJs
              tags {
                id
                tag
                title
              }
              title
            }
          }
        }
      `,
      variables: {
        id: pageId,
      },
    });

    if (!originalPage.data || !originalPage.data.pages) {
      throw new Error(
        `Failed to fetch original page data for page ID ${pageId}`
      );
    }

    // descriptionをオーバーライドして更新
    const result = await this.client.mutate<{
      pages: {
        update: {
          responseResult: {
            succeeded: boolean;
            message: string;
          };
        };
      };
    }>({
      mutation: gql`
        mutation UpdatePageDescription(
          $id: Int!
          $content: String!
          $description: String!
          $editor: String!
          $isPrivate: Boolean!
          $isPublished: Boolean!
          $locale: String!
          $path: String!
          $publishEndDate: Date!
          $publishStartDate: Date!
          $scriptCss: String!
          $scriptJs: String!
          $tags: [String!]!
          $title: String!
        ) {
          pages {
            update(
              id: $id
              content: $content
              description: $description
              editor: $editor
              isPrivate: $isPrivate
              isPublished: $isPublished
              locale: $locale
              path: $path
              publishEndDate: $publishEndDate
              publishStartDate: $publishStartDate
              scriptCss: $scriptCss
              scriptJs: $scriptJs
              tags: $tags
              title: $title
            ) {
              responseResult {
                succeeded
                message
              }
            }
          }
        }
      `,
      variables: {
        ...originalPage.data.pages.single,
        description: newDescription,
        tags: originalPage.data.pages.single.tags.map((tag) => tag.tag),
      },
    });

    if (!result.data || !result.data.pages) {
      throw new Error(`Failed to update description for page ID ${pageId}`);
    }

    if (!result.data.pages.update.responseResult.succeeded) {
      throw new Error(
        `Failed to update description for page ID ${pageId}: ${result.data.pages.update.responseResult.message}`
      );
    }

    // 更新後のページ情報を取得して返す
    const updatedPage = await this.getPageById(pageId);
    return {
      id: updatedPage.id,
      title: updatedPage.title,
      description: newDescription,
    };
  }
}
