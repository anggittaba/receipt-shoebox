# Real touch-drag check on a 390px phone viewport (CDP touch events).
import asyncio
from playwright.async_api import async_playwright
async def m():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(executable_path="/usr/bin/google-chrome")
    c=await b.new_context(viewport={"width":390,"height":844},has_touch=True,is_mobile=True,device_scale_factor=2); p=await c.new_page()
    await p.goto("http://localhost:8851/"); await p.click("#runBtn")
    await p.wait_for_function("document.querySelectorAll('#inboxGrid .receipt-wrap:not(.r-reading)').length==28")
    await p.evaluate("shoeboxShow('board')"); await p.wait_for_timeout(300)
    box=await p.query_selector('.box[data-cat="office"]'); await box.scroll_into_view_if_needed()
    s=await (await p.query_selector('.slip[data-id="D13"]')).bounding_box(); t=await box.bounding_box()
    cdp=await c.new_cdp_session(p)
    pt=lambda x,y:[{"x":x,"y":y}]
    x0,y0=s["x"]+30,s["y"]+10; x1,y1=t["x"]+t["width"]/2,t["y"]+70
    await cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":pt(x0,y0)})
    for i in range(1,13): await cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":pt(x0+(x1-x0)*i/12,y0+(y1-y0)*i/12)}); await p.wait_for_timeout(25)
    await cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]}); await p.wait_for_timeout(300)
    ok=await p.evaluate("document.querySelector('.box[data-cat=office] .slip[data-id=D13]')!==null")
    print("touch drag ok:",ok,"| toast:",(await p.inner_text("#toasts")).split("\n")[-1])
    await b.close()
asyncio.run(m())
