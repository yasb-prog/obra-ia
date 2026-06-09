export default async function handler(req, res) {

  try {

    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(req.body)
      }
    );

    const text = await response.text();

    return res.status(200).json({
      anthropicStatus: response.status,
      anthropicResponse: text
    });

  } catch (error) {

    return res.status(500).json({
      error: error.message
    });

  }
}