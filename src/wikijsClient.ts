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
          tags: { id: number; tag: string; title: string }[];
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
              tags {
                id
                tag
                title
              }
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

  private async getFullPageData(pageId: number) {
    const result = await this.client.query<{
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
        query GetFullPageData($id: Int!) {
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

    if (!result.data || !result.data.pages) {
      throw new Error(`Failed to fetch page data for page ID ${pageId}`);
    }

    return result.data.pages.single;
  }

  private async updatePageWithChanges(
    pageId: number,
    changes: Record<string, unknown>,
    operationName: string
  ) {
    const originalPage = await this.getFullPageData(pageId);

    const variables = {
      ...originalPage,
      ...changes,
      tags: changes.tags ? changes.tags : originalPage.tags.map((tag) => tag.tag),
    };

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
        mutation UpdatePage(
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
      variables,
    });

    if (!result.data || !result.data.pages) {
      throw new Error(`Failed to update page ID ${pageId} (${operationName})`);
    }

    if (!result.data.pages.update.responseResult.succeeded) {
      throw new Error(
        `Failed to update page ID ${pageId} (${operationName}): ${result.data.pages.update.responseResult.message}`
      );
    }
  }

  async updatePageTags(pageId: number, newTags: string[]) {
    await this.updatePageWithChanges(pageId, { tags: newTags }, 'updatePageTags');
    const updatedPage = await this.getPageById(pageId);
    return {
      id: updatedPage.id,
      title: updatedPage.title,
      tags: updatedPage.tags,
    };
  }

  async updatePageDescription(pageId: number, newDescription: string) {
    await this.updatePageWithChanges(
      pageId,
      { description: newDescription },
      'updatePageDescription'
    );
    const updatedPage = await this.getPageById(pageId);
    return {
      id: updatedPage.id,
      title: updatedPage.title,
      description: newDescription,
    };
  }
}
