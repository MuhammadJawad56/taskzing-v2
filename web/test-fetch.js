async function test() {
  const url = "https://taskzing-backend-production.up.railway.app/auth/login";
  const body = {
    email: "jawadkamil307@gmail.com",
    password: "YourSecurePassword123"
  };
  console.log(`Sending POST to ${url}`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text.slice(0, 500)}`);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
