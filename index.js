const http = require("http");
const dedent = require("dedent");
const { Configuration, OpenAIApi } = require("openai");

require("dotenv").config();

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

function getCompletionMessages(pathname, search) {
  return [
    {
      role: "user",
      content: dedent`
				You are a web server from the 1990s.
				I will give you a URL, and you will return the HTML for that page.
				Output valid HTML.
				The design of the page should be fun and retro.
				The design should resemble geocities.
				Output CSS inline using style attributes.
				Do not output CSS using <style> tags.
				The page should have several links to other pages on the site.

				URL: ${pathname}${search}
			`,
    },
  ];
}

const server = http.createServer(async (req, res) => {
  const { pathname, search } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
			<h1>Welcome to the Magic Hotline!</h1>
			<style>
				label, input {
					font-size: 20px;
					padding: 8px;
				}

				form {
					background: white;
					padding: 8px;
					border: 1px solid black;
					border-radius: 8px;
				}
			</style>
			<form>
				<label>
					URL: <input type="text" placeholder="/weather/Hoboken" />
				</label>
			</form>
			<script>
				document.querySelector('form').addEventListener('submit', (e) => {
					e.preventDefault();
					const input = document.querySelector('input');
					window.location.href = input.value;
				})
			</script>
		`);
  } else {
    res.writeHead(200, {
      "Content-Type": "text/html",
      "Cache-Control": "no-cache",
    });

    const completion = await openai.createChatCompletion(
      {
        model: "gpt-3.5-turbo",
        messages: getCompletionMessages(pathname, search),
        stream: true,
      },
      { responseType: "stream" }
    );

    // chatgpt loves to output doctype> first (no <!)
    let skip = true;
    completion.data.on("data", (buffer) => {
      const data = buffer.toString();

      if (data === "[DONE]") {
        return res.end();
      }

      try {
        const json = JSON.parse(data.slice(6));
        if (
          json.choices &&
          json.choices[0] &&
          json.choices[0].delta &&
          json.choices[0].delta.content
        ) {
          if (skip) {
            skip = false;
            return;
          }
          // TODO: buffer?
          res.write(json.choices[0].delta.content);
        }
      } catch (e) {}
    });
  }
});

server.listen(3000, () => {
  console.log("Server listening at http://localhost:3000");
});
