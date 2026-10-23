import type { QueryClient } from "@tanstack/react-query";

const dataRoots = [
  ["dashboard"],
  ["transactions"],
  ["orders"],
  ["order"],
  ["catalog"],
  ["bootstrap"],
  ["materials"],
  ["workers"],
  ["worker"],
  ["clients"],
  ["search"],
];

export function invalidateData(queryClient: QueryClient) {
  dataRoots.forEach((queryKey) => {
    void queryClient.invalidateQueries({ queryKey });
  });
}
