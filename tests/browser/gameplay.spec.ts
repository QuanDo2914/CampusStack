import {test,expect} from '@playwright/test';
test('game state and results synchronize between independent browsers',async({browser})=>{
 const a=await browser.newContext();const b=await browser.newContext();const host=await a.newPage();const guest=await b.newPage();
 await host.goto('/');await host.getByLabel('Display name').fill('Host');await host.getByRole('button',{name:'Create a room',exact:true}).click();const code=await host.getByTestId('room-code').innerText();
 await guest.goto('/');await guest.getByRole('button',{name:'Join room',exact:true}).click();await guest.getByLabel('Display name').fill('Guest');await guest.getByLabel('Room code').fill(code);await guest.getByRole('button',{name:'Join the room',exact:true}).click();await expect(host.getByRole('button',{name:'Start match'})).toBeEnabled();
 await host.getByRole('button',{name:'Start match'}).click();await host.getByRole('button',{name:'Roll Dice'}).click();await expect(guest.getByText(/Host rolled [1-6]/)).toBeVisible();
 const buy=host.getByRole('button',{name:/Buy for/});if(await buy.isVisible())await buy.click();
 await guest.reload();await expect(guest.getByTestId('player-Guest')).toBeVisible();
 await expect(host.getByRole('table',{name:'Final leaderboard'})).toBeVisible({timeout:15000});await expect(guest.getByRole('table',{name:'Final leaderboard'})).toBeVisible({timeout:15000});await expect(guest.getByRole('table',{name:'Final leaderboard'})).toHaveText(await host.getByRole('table',{name:'Final leaderboard'}).innerText());
 await a.close();await b.close();
});
test('mobile game entry and rules fit a narrow screen',async({page})=>{
 await page.setViewportSize({width:320,height:740});await page.goto('/');await expect(page.getByRole('heading',{name:'Let’s get a room.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
 await page.getByRole('button',{name:'Rules',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByText(/30 seconds/)).toBeVisible();await page.getByRole('button',{name:'Close rules'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
