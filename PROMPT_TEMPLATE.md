# SecretStash — Full App Brief (fill in & paste to Cursor)

Use this after the PoC works. Copy the filled sections into a new chat to build the production app.

---

## 1. Product vision

- **App name:**
- **One sentence:**
- **Primary user:**
- **Core job:** (e.g. destination-aware packing + street/functional fashion suggestions)

---

## 2. Platform & scope

- **Platform:** mobile web PWA / native iOS / React Native Expo / other:
- **v1 must-ship features:** (list 5 max)
- **Explicitly NOT in v1:**

---

## 3. Subject & guardrails

- **In scope — users CAN ask:**
- **Out of scope — users CANNOT ask:**
- **Strictness:** High / Medium / Low
- **Example off-topic refusal copy:**

### Defense layers to implement (check all that apply)
- [ ] System prompt
- [ ] Intent routing (pre-LLM)
- [ ] RAG (destination guides, brand guides)
- [ ] Tool calling only for commerce facts
- [ ] Post-response filter
- [ ] UI card tiers (Buy Now / Shop Brand / Pack Tip)

---

## 4. Trip & styling inputs

- **Required inputs:** destination, dates, trip type, …
- **Optional inputs:** budget, luggage size, style prefs, owned items
- **Output format:** capsule list / outfit cards / day-by-day / other:

---

## 5. Data sources & commerce

### Live APIs (shoppable)
- [ ] Channel3
- [ ] Etsy Open API
- [ ] Affiliate feeds (which networks/retailers):
- [ ] Weather API (OpenWeatherMap, etc.)
- [ ] Other:

### Curated (no live stock)
- **Hero brands to manual-guide:** (e.g. Issey Miyake, Patagonia, …)
- **Brand guide JSON location / format:**

### Card types
- [ ] Buy Now (live price)
- [ ] Shop Brand (link only)
- [ ] Pack Tip (no purchase)
- [ ] Reasoning chip (“why this layer”)

---

## 6. AI behavior

- **Model:** Claude / OpenAI / other:
- **Streaming:** yes / no
- **Max reply length default:**
- **Tone:** minimal stylist / friendly / luxury / other:
- **Show reasoning:** brief why / hidden / expandable
- **Confidence rules:** when to refuse price/stock claims

---

## 7. Conversation UX (AI-specific)

- [ ] Multi-turn memory (trip brief pinned)
- [ ] Pivot mid-convo (“actually Seoul not Tokyo”)
- [ ] User corrections (“I hate pleats”, “I own this jacket”)
- [ ] Editable capsule/plan
- [ ] Attach image URL
- [ ] Suggested prompt chips
- [ ] Long-chat summarize + visualize
- [ ] Stop generation / regenerate

---

## 8. Design

- **Figma link(s):**
- **Reference apps:**
- **Light / dark / system:**
- **New screens beyond PoC:** (history, settings, product detail, …)

---

## 9. Auth & persistence

- [ ] No login (local only)
- [ ] Login type:
- [ ] Save chats / trips:
- [ ] Save wardrobe profile:

---

## 10. Example conversations (paste 3–5)

### On-topic
**User:**
**Ideal assistant:**

### Off-topic
**User:**
**Ideal assistant:**

### No-API brand (e.g. Issey Miyake)
**User:**
**Ideal assistant:**

---

## 11. Success criteria

- 
- 
- 

---

## 12. Deployment & env

- **GitHub repo:**
- **Vercel project:**
- **Env vars:** `ANTHROPIC_API_KEY`, …
- **Budget / rate limits:**

---

## Quick paste block (minimal)

```text
Build SecretStash v2 from PoC in chat_ai-UX.

Domain: travel + street/functional fashion
Platform: 
Strictness: 
APIs: 
Brand guides: 
Card tiers: 
Must-have UX: 
Not in v1: 
Figma: 
Success: 
```
