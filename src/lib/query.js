// Function to parse a query string using URLSearchParams
export const parseQueryString = (query) => {
  const params = new URLSearchParams(query);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
};

// Function to stringify an object as query parameters using URLSearchParams
export const stringifyQueryParams = (paramsObject) => {
  const params = new URLSearchParams();
  for (const key in paramsObject) {
    if (Object.hasOwnProperty.call(paramsObject, key)) {
      params.append(key, paramsObject[key]);
    }
  }
  return params.toString();
};
