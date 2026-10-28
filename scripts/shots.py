# Headless Playwright check + screenshots. Usage: python3 scripts/shots.py OUTDIR
import sys, asyncio
from playwright.async_api import async_playwright
OUT = sys.argv[1]; URL = "http://localhost:8851/"
async def run_demo(p):
    await p.click("#runBtn"); await p.wait_for_function("document.querySelectorAll('#inboxGrid .receipt-wrap:not(.r-reading)').length==28", timeout=20000); await p.wait_for_timeout(600)
async def drag(p, src, box):
    s = await p.query_selector(src); b = await p.query_selector(box)
    await b.scroll_into_view_if_needed(); await s.scroll_into_view_if_needed(); await p.wait_for_timeout(150)
    sb = await s.bounding_box(); bb = await b.bounding_box()
    await p.mouse.move(sb["x"]+20, sb["y"]+8); await p.mouse.down()
    for i in range(1, 11):
        await p.mouse.move(sb["x"]+20+(bb["x"]+bb["width"]/2-sb["x"]-20)*i/10, sb["y"]+8+(bb["y"]+60-sb["y"]-8)*i/10); await p.wait_for_timeout(30)
    await p.mouse.up()
async def main():
    errs = []
    async with async_playwright() as pw:
        br = await pw.chromium.launch(executable_path="/usr/bin/google-chrome")
        for theme in ["light", "dark"]:
            for name, vp in [("desk", {"width":1280,"height":800}), ("mob", {"width":390,"height":844})]:
                ctx = await br.new_context(viewport=vp, device_scale_factor=2 if name=="mob" else 1, has_touch=(name=="mob"), accept_downloads=True)
                p = await ctx.new_page(); p.on("pageerror", lambda e: errs.append(str(e))); p.on("console", lambda m: m.type=="error" and errs.append(m.text))
                await ctx.add_init_script(f"localStorage.setItem('shoebox-theme','{theme}')")
                await p.goto(URL); await p.screenshot(path=f"{OUT}/{theme}-{name}-0-empty.png")
                await run_demo(p); await p.screenshot(path=f"{OUT}/{theme}-{name}-1-inbox.png")
                await p.evaluate("shoeboxShow('board')"); await p.wait_for_timeout(300)
                await p.wait_for_timeout(1500); await drag(p, '.slip[data-id="D13"]', '.box[data-cat="office"]'); await p.wait_for_timeout(550)
                cat = await p.evaluate("document.querySelector('.box[data-cat=office] .slip[data-id=D13]')!==null")
                toast = await p.inner_text("#toasts")
                print(theme, name, "drag ok:", cat, "toast:", toast.replace("\n"," | "))
                await p.screenshot(path=f"{OUT}/{theme}-{name}-2-board.png")
                await p.wait_for_timeout(2000); await p.evaluate("shoeboxShow('review')"); await p.wait_for_timeout(300); await p.screenshot(path=f"{OUT}/{theme}-{name}-3-review.png")
                await p.evaluate("shoeboxShow('summary')"); await p.wait_for_timeout(900); await p.screenshot(path=f"{OUT}/{theme}-{name}-4-summary.png", full_page=True)
                async with p.expect_download() as d: await p.click("#csvAll")
                dl = await d.value; await dl.save_as(f"{OUT}/{theme}-{name}.csv")
                await ctx.close()
        await br.close()
    print("errors:", errs)
asyncio.run(main())
