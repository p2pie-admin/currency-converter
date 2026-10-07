import { gql } from "graphql-request";

export const AuthMutation = gql`
  mutation login($identifier: String!, $password: String!) {
    login(
      input: { identifier: $identifier, password: $password, provider: "local" }
    ) {
      jwt
      user {
        username
        email
      }
    }
  }
`;

export const ChangeAccuracyMutation = gql`
  mutation UpdateCurrency($id: ID!, $accuracy: Int) {
    updateCurrency(id: $id, data: { accuracy: $accuracy }) {
      data {
        id
        attributes {
          code
          accuracy
        }
      }
    }
  }
`;

export const CryptoForCoingeckoQuery = gql`
  {
    selector {
      data {
        attributes {
          sections(filters: { en_title: { contains: "rypto" } }) {
            pm_groups(pagination: { start: 0, limit: 1000 }) {
              data {
                id
                attributes {
                  en_name
                  options {
                    ... on ComponentSelectorCurrency {
                      currency {
                        data {
                          id
                          attributes {
                            code
                          }
                        }
                      }
                    }
                    ... on ComponentSelectorSubgroup {
                      currency {
                        data {
                          id
                          attributes {
                            code
                            accuracy
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const citiesQuery = gql`
  {
    parserSetting {
      data {
        attributes {
          cities
        }
      }
    }
  }
`;
