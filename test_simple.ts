import { fetchTransactions } from "./src/lib/finance-api";

async function test() {
  try {
    const result = await fetchTransactions({});
    console.log("Success!");
    console.log("Count:", result.count);
    console.log("Data length:", result.data.length);
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

test();
