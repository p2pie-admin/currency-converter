import { gql } from "graphql-request";
import db from "./db";
import callStrapi from "./services/callStrapi";

const MUTATION = gql`
  mutation CreateArticle($header: String, $subheader: String, $code: String) {
    createArticle(
      data: { header: $header, subheader: $subheader, code: $code }
    ) {
      data {
        id
      }
    }
  }
`;

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export const createArticles = () => {
  const crypto = db.getData(".crypto") as { [key: string]: string };
  Object.entries(crypto).map(async ([name, code]) => {
    await new Promise((r) => setTimeout(r, 200));
    const data = {
      header: `${capitalizeFirstLetter(name)} ${code.toUpperCase()}`,
      subheader: `All you need to know about ${name}`,
      code: name,
      section: "pm",
    };

    callStrapi(MUTATION, data);
    console.log(data);
  });
};
