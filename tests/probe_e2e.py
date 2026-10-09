from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=(ROOT/'design/prototype/index.html').as_uri()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for name,sz in [('desktop',{'width':1440,'height':900}),('mobile',{'width':390,'height':844})]:
        page=browser.new_page(viewport=sz,device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda exc: errors.append(str(exc)))
        page.set_content((ROOT/'design/prototype/index.html').read_text(),wait_until='load')
        assert page.locator('#rows tr').count()==8
        assert page.locator('#focusCount').inner_text()=='0 / 3'
        page.get_by_role('button',name='Add Chess to weekly focus').click()
        assert page.locator('#focusCount').inner_text()=='1 / 3'
        page.get_by_role('button',name='Add French to weekly focus').click()
        page.get_by_role('button',name='Add My Daily Devotion to weekly focus').click()
        assert page.locator('#focusCount').inner_text()=='3 / 3'
        page.locator('#query').fill('Recipe')
        assert page.locator('#rows tr').count()==1
        page.locator('#query').fill('')
        if name=='desktop':
            page.screenshot(path=str(ROOT/'design/prototype/desktop.png'),full_page=True)
        else:
            page.screenshot(path=str(ROOT/'design/prototype/mobile.png'),full_page=True)
        assert not errors,errors
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'unexpected horizontal overflow'
        print(name, 'PASS', 'errors',errors, 'screen',sz)
        page.close()
    browser.close()
