import {test,expect} from '@playwright/test';
test('two independent browsers join, synchronize, start and refresh',async({browser})=>{
 const a=await browser.newContext();const b=await browser.newContext();const host=await a.newPage();const guest=await b.newPage();
 await host.goto('/');await host.getByLabel('Display name').fill('Quan');await host.getByRole('button',{name:'Create a room',exact:true}).click();
 const code=await host.getByTestId('room-code').innerText();await expect(host.getByRole('button',{name:'Start match'})).toBeDisabled();
 await guest.goto('/');await guest.getByLabel('Display name').fill('Alex');await guest.getByRole('button',{name:'Join room',exact:true}).click();await guest.getByLabel('Room code').fill(code);await guest.getByRole('button',{name:'Join the room',exact:true}).click();
 await expect(host.getByText('Alex',{exact:true})).toHaveCount(1);await expect(guest.getByText('Quan',{exact:true})).toHaveCount(1);
 await host.getByRole('button',{name:'Start match'}).click();await expect(guest.getByRole('heading',{name:'Make every move count.'})).toBeVisible();
 await guest.reload();await expect(guest.getByRole('heading',{name:'Make every move count.'})).toBeVisible();await expect(guest.getByTestId('player-Alex')).toHaveCount(1);
 await a.close();await b.close();
});
