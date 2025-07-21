package selenium;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.interactions.Action;
import org.openqa.selenium.interactions.Actions;

public class KeysUpDown {
    public static void main(String[] args) throws Exception {
        WebDriverManager.chromedriver().setup();
        WebDriver driver = new ChromeDriver();
        driver.manage().window().maximize();
        Thread.sleep(1000);
        driver.get("https://www.facebook.com/");
        Thread.sleep(1000);

        WebElement emailElement = driver.findElement(By.xpath("//input[@id='email']"));
//        emailElement.sendKeys("jek");
        WebElement pass = driver.findElement(By.xpath("//input[@id='pass']"));
//        pass.sendKeys("fggd");

        //Actions to be performed
        Actions actions = new Actions((driver));
        Action action = actions.moveToElement(emailElement).sendKeys("testData")
                .keyDown(Keys.CONTROL).sendKeys("a").sendKeys("c")
                .keyUp(Keys.CONTROL).moveToElement(pass).click()
                .keyDown(Keys.CONTROL).sendKeys("v").build();
        action.perform();
    }
}
