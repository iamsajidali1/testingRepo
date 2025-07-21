package selenium;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.interactions.Action;
import org.openqa.selenium.interactions.Actions;

import java.util.Iterator;
import java.util.Set;

public class WindowPopup {
    public static void main(String[] args) throws Exception {
        WebDriverManager.chromedriver().setup();
        WebDriver driver = new ChromeDriver();
        driver.manage().window().maximize();
        Thread.sleep(1000);
        driver.get("https://www.facebook.com/");
        driver.findElement(By.xpath("//a[@data-testid='open-registration-form-button']")).click();
        Thread.sleep(1000);
//        driver.navigate().to(("https://www.instagram.com/"));
        driver.findElement(By.linkText("Instagram")).click();
        Thread.sleep(1000);
//        driver.findElement(By.linkText("Forgot password?")).click();
//        System.out.println("forgot password clicked");

        String window = driver.getWindowHandle();
        System.out.println(window);
        Set<String> windows = driver.getWindowHandles();
        System.out.println(windows);

        for(String handle : windows){
            System.out.println(handle);
            driver.switchTo().window(handle);
            System.out.println(driver.getTitle());
//            driver.switchTo().window("handle");
            System.out.println("====================================");
        }
//        Iterator<String> it =windows.iterator();
//        while(it.hasNext()){
//            driver.switchTo().window(it.next());
//            System.out.println(driver.getTitle());
//        }
        Actions actions = new Actions(driver);
//        Action action = actions.moveByOffset(100,100).contextClick().build();
//        action.perform();
        actions.moveToElement(driver.findElement(By.linkText("Forgot password?"))).click().build().perform();
//        driver.close();

    }
}
