import { fetchTransactions } from "./src/lib/finance-api";

async function test() {
  try {
    const result = await fetchTransactions({
      page: 1,
      pageSize: 5,
      startDate: '2026-08-01',
      endDate: '2026-08-31'
    });
    console.log("Success!");
    console.log("Count:", result.count);
    console.log("Data length:", result.data.length);
    if (result.data.length > 0) {
      console.log("First item client_id:", result.data[0].client_id);
      console.log("First item status:", result.data[0].status);
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

test();
