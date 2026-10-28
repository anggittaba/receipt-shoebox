# Records demo video (1280x720) and the dark-mode screenshot. Usage: python3 scripts/record_demo.py OUTDIR
import sys, asyncio
from playwright.async_api import async_playwright
OUT = sys.argv[1]; URL = "http://localhost:8851/"
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(executable_path="/usr/bin/google-chrome")
        # dark-mode still with the cat doodles beside unclear receipts
        c = await br.new_context(viewport={"width":1280,"height":800}); await c.add_init_script("localStorage.setItem('shoebox-theme','dark')")
        p = await c.new_page(); await p.goto(URL); await p.click("#runBtn"); await p.wait_for_timeout(6500)
        await p.evaluate("window.scrollTo(0, 640)"); await p.wait_for_timeout(300); await p.screenshot(path=f"{OUT}/5-dark-mode.png"); await c.close()
        ctx = await br.new_context(viewport={"width":1280,"height":720}, record_video_dir="/tmp/vid", record_video_size={"width":1280,"height":720})
        p = await ctx.new_page(); await p.goto(URL); await p.wait_for_timeout(1800)
        b = await p.query_selector("[data-run]"); bb = await b.bounding_box()
        await p.mouse.move(bb["x"]+bb["width"]/2, bb["y"]+bb["height"]/2, steps=15); await p.wait_for_timeout(300); await p.mouse.click(bb["x"]+bb["width"]/2, bb["y"]+bb["height"]/2)
        await p.wait_for_timeout(5200)
        for y in range(0, 900, 30): await p.evaluate(f"window.scrollTo(0,{y})"); await p.wait_for_timeout(40)
        await p.wait_for_timeout(1500)
        await p.click("[data-view=board]"); await p.wait_for_timeout(1500)
        s = await (await p.query_selector('.slip[data-id="D13"]')).bounding_box(); t = await (await p.query_selector('.box[data-cat="office"]')).bounding_box()
        await p.mouse.move(s["x"]+30, s["y"]+10, steps=12); await p.wait_for_timeout(300); await p.mouse.down()
        await p.mouse.move(t["x"]+t["width"]/2, t["y"]+80, steps=30); await p.wait_for_timeout(300); await p.mouse.up()
        await p.wait_for_timeout(2600)
        await p.click("[data-view=review]"); await p.wait_for_timeout(2200)
        await p.click(".rv [data-act=discard]"); await p.wait_for_timeout(1500)
        card = await p.query_selector(".rv"); await (await card.query_selector('[data-f=note]')).fill("Coffee while waiting for a delivery"); await p.wait_for_timeout(500)
        await (await card.query_selector('[data-act=file]')).click(); await p.wait_for_timeout(1800)
        await p.click("[data-view=summary]"); await p.wait_for_timeout(3000)
        for y in range(0, 300, 20): await p.evaluate(f"window.scrollTo(0,{y})"); await p.wait_for_timeout(40)
        await p.wait_for_timeout(1000); await p.click("#themeBtn"); await p.wait_for_timeout(2500)
        await p.click("[data-view=board]"); await p.wait_for_timeout(2500)
        await ctx.close(); print(await p.video.path())
        await br.close()
asyncio.run(main())
